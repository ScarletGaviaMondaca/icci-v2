import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Certificados } from './certificados';

describe('Certificados', () => {
  let component: Certificados;
  let fixture: ComponentFixture<Certificados>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Certificados],
    }).compileComponents();

    fixture = TestBed.createComponent(Certificados);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
