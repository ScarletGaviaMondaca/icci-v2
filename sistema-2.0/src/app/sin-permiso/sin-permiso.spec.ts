import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SinPermiso } from './sin-permiso';

describe('SinPermiso', () => {
  let component: SinPermiso;
  let fixture: ComponentFixture<SinPermiso>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SinPermiso],
    }).compileComponents();

    fixture = TestBed.createComponent(SinPermiso);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
